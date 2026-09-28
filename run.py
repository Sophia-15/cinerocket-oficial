"""Inicia backend e frontend no Linux e no Windows."""

from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"


def backend_python() -> Path:
    if os.name == "nt":
        executable = BACKEND / ".venv" / "Scripts" / "python.exe"
        setup = "py -3 -m venv backend\\.venv"
    else:
        executable = BACKEND / ".venv" / "bin" / "python"
        setup = "python3 -m venv backend/.venv"

    if not executable.is_file():
        raise RuntimeError(
            "Ambiente virtual do backend não encontrado. "
            f"Na raiz do projeto, execute: {setup}. "
            "Depois instale as dependências conforme o README."
        )
    return executable


def prepare() -> tuple[Path, Path]:
    python = backend_python()
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("Node.js não encontrado no PATH.")

    for directory in (BACKEND, FRONTEND):
        env_file = directory / ".env"
        if not env_file.exists():
            shutil.copyfile(directory / ".env.example", env_file)
            print(f"Criado {env_file.relative_to(ROOT)}", flush=True)

    if not (FRONTEND / "node_modules").is_dir():
        npm = "npm.cmd" if os.name == "nt" else "npm"
        if shutil.which(npm) is None:
            raise RuntimeError("npm não encontrado no PATH.")
        print("Instalando dependências do frontend...", flush=True)
        subprocess.run([npm, "install"], cwd=FRONTEND, check=True)

    print("Aplicando a migração do banco...", flush=True)
    subprocess.run([str(python), "-m", "alembic", "upgrade", "head"], cwd=BACKEND, check=True)
    return python, Path(node)


def stop_processes(processes: list[subprocess.Popen[bytes]]) -> None:
    for process in processes:
        if process.poll() is not None:
            continue
        if os.name == "nt":
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        else:
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass

    for process in processes:
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            if os.name != "nt":
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            process.wait()


def main() -> int:
    processes: list[subprocess.Popen[bytes]] = []
    try:
        python, node = prepare()
        options = (
            {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}
            if os.name == "nt"
            else {"start_new_session": True}
        )
        processes.append(
            subprocess.Popen(
                [str(python), "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
                cwd=BACKEND,
                **options,
            )
        )
        processes.append(
            subprocess.Popen(
                [
                    str(node),
                    str(FRONTEND / "node_modules" / "vite" / "bin" / "vite.js"),
                    "--strictPort",
                ],
                cwd=FRONTEND,
                **options,
            )
        )

        print("Backend:  http://localhost:8000 (docs em /docs)", flush=True)
        print("Frontend: http://localhost:5173", flush=True)
        print("Ctrl+C para encerrar os dois.", flush=True)

        while True:
            for process in processes:
                code = process.poll()
                if code is not None:
                    print(f"Um dos serviços encerrou com código {code}.", file=sys.stderr)
                    return code or 1
            time.sleep(0.3)
    except KeyboardInterrupt:
        return 0
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"Erro ao iniciar o CineRocket: {error}", file=sys.stderr)
        return 1
    finally:
        stop_processes(processes)


if __name__ == "__main__":
    sys.exit(main())
