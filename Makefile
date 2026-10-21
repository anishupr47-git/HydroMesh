.PHONY: check test run seed eval demo fmt

check:
	ruff check . && mypy hydromesh/ && pytest

test:
	pytest -v

run:
	uvicorn hydromesh.api.app:create_app --factory --reload

seed:
	python scripts/train_triage.py && python scripts/ingest_sops.py

eval:
	python scripts/eval_baseline.py

demo:
	docker compose up -d redis && make seed && make run

fmt:
	ruff format .
