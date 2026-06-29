'use strict';

module.exports = (allowedRoles) => (req, res, next) => {
  const userRole = req.user?.role?.name;

  if (!userRole || !allowedRoles.includes(userRole)) {
    return res.status(403).json({
      error: 'Acesso negado. Você não tem permissão para acessar este recurso.',
    });
  }

  next();
};
