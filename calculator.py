def add(a, b):
    return a + b


def subtract(a, b):
    return a - b


def divide(a, b):
    """Return a / b, raising ValueError on zero."""
    if b == 0:
        raise ValueError("division by zero")
    return a / b
