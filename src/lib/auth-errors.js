export function getFriendlyAuthError(error, fallback = "No se pudo completar la acción") {
  const message = String(error?.message || error || "").toLowerCase();

  if (!message) return fallback;
  if (message.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirma tu correo antes de iniciar sesión.";
  }
  if (message.includes("user already registered") || message.includes("already registered")) {
    return "Ya existe una cuenta con este correo.";
  }
  if (message.includes("password should be at least") || message.includes("weak password")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  if (message.includes("same password")) {
    return "La nueva contraseña debe ser diferente a la anterior.";
  }
  if (message.includes("expired") || message.includes("invalid")) {
    return "El enlace no es válido o ya expiró. Solicita uno nuevo.";
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return "Demasiados intentos. Espera unos minutos y vuelve a intentar.";
  }

  return fallback;
}
