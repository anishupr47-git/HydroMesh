.PHONY: check test run seed eval demo fmt

check:
	python -m ruff check . && python -m mypy hydromesh/ && python -m pytest

test:
	python -m pytest -v

run:
	python -m uvicorn hydromesh.api.app:create_app --factory --reload

seed:
	python scripts/train_triage.py && python scripts/ingest_sops.py

eval:
	python scripts/eval_baseline.py

demo:
	docker compose up -d redis && make seed && make run

fmt:
	python -m ruff format .
