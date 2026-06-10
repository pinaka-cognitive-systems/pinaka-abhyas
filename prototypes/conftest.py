"""conftest.py for prototypes/

Registers the engine-py prototype package as "engine" in sys.modules so
that the test files in prototypes/engine-py/tests/ can import from
"engine.mastery", "engine.types", etc. without changes.

The directory is named engine-py (with a hyphen) to make clear it is the
archived Python prototype, not the canonical engine. The hyphen makes it
an invalid Python identifier so we register it manually as "engine".
"""
import sys
import pathlib
import importlib.abc
import importlib.machinery

_ENGINE_PY_DIR = pathlib.Path(__file__).parent / "engine-py"


class _EngineFinder(importlib.abc.MetaPathFinder):
    """Redirect 'engine' and 'engine.*' imports to prototypes/engine-py/."""

    def find_spec(self, fullname, path, target=None):
        if fullname == "engine":
            spec = importlib.machinery.ModuleSpec(
                name="engine",
                loader=importlib.machinery.SourceFileLoader(
                    "engine", str(_ENGINE_PY_DIR / "__init__.py")
                ),
                origin=str(_ENGINE_PY_DIR / "__init__.py"),
                is_package=True,
            )
            spec.submodule_search_locations = [str(_ENGINE_PY_DIR)]
            return spec
        if fullname.startswith("engine."):
            subname = fullname[len("engine."):]
            # Guard against sub-packages (tests sub-package).
            if "." in subname:
                return None
            mod_path = _ENGINE_PY_DIR / f"{subname}.py"
            if mod_path.exists():
                spec = importlib.machinery.ModuleSpec(
                    name=fullname,
                    loader=importlib.machinery.SourceFileLoader(
                        fullname, str(mod_path)
                    ),
                    origin=str(mod_path),
                    is_package=False,
                )
                return spec
        return None


if not any(isinstance(f, _EngineFinder) for f in sys.meta_path):
    sys.meta_path.insert(0, _EngineFinder())
