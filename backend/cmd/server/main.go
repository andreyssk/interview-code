package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/app/interview-prep/internal/api"
	"github.com/app/interview-prep/internal/db"
	"github.com/app/interview-prep/internal/store"
	"github.com/app/interview-prep/migrations"
)

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.Connect(ctx, env("DATABASE_URL", "postgres://prep:prep@localhost:5432/prep?sslmode=disable"))
	if err != nil {
		log.Fatalf("connect db (is it running? try `make db`): %v", err)
	}
	defer pool.Close()
	if err := db.Migrate(ctx, pool, migrations.FS); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	// Localhost only: this server executes arbitrary Go code.
	addr := env("ADDR", "127.0.0.1:8080")
	srv := &http.Server{Addr: addr, Handler: api.New(store.New(pool)).Handler(), ReadHeaderTimeout: 10 * time.Second}

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		srv.Shutdown(shutdownCtx)
	}()

	log.Printf("listening on %s", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
