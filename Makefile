.PHONY: db db-down backend frontend

db:
	docker compose up -d --wait

db-down:
	docker compose down

backend:
	cd backend && go run ./cmd/server

frontend:
	cd frontend && npm run dev
