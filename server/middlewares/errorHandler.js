class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

function notFoundHandler(req, _res, next) {
  next(new AppError(`Route introuvable : ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
}

function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.isOperational
    ? err.message
    : 'Une erreur interne est survenue. Veuillez réessayer.';

  if (statusCode >= 500) {
    console.error('[ERROR]', req.requestId || '-', err);
  }

  res.status(statusCode).json({
    ok: false,
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
    requestId: req.requestId || null,
  });
}

module.exports = { AppError, notFoundHandler, errorHandler };
