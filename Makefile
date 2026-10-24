.PHONY: install lint type test check security fmt run seed eval demo

install:
	pip install -e ".[dev]"

lint:
	python -m ruff check .
	python -m ruff format --check .

type:
	python -m mypy hydromesh/

test:
	python -m pytest -v

check:
	python -m ruff check .
	python -m ruff format --check .
	python -m mypy hydromesh/
	python -m pytest --cov=hydromesh
	python -m coverage report --include=hydromesh/safety.py --fail-under=100

security:
	python -m bandit -r hydromesh/ -ll
	python -m pytest tests/security/

fmt:
	python -m ruff format .
	python -m ruff check --fix .

run:
	python -m uvicorn hydromesh.api.app:create_app --factory --reload

seed:
	python scripts/train_triage.py && python scripts/ingest_sops.py

eval:
	python scripts/eval_baseline.py

demo:
	docker compose up -d redis && make seed && make run
