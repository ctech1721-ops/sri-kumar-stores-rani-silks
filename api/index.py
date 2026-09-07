import sys
import os

backend_path = os.path.join(os.path.dirname(__file__), "backend")

if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

<<<<<<< HEAD
from app import app
=======
from app import app
>>>>>>> 905d1f7a0061f25ce2e0ffaca59fa7e1f3d177b9
