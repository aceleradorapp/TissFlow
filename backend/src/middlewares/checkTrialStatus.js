'use strict';

module.exports = (req, res, next) => {
  const trialEndsAt = req.user?.trial_ends_at;

  if (trialEndsAt && new Date() > new Date(trialEndsAt)) {
    return res.status(403).json({
      error: 'Seu período de teste gratuito expirou. Faça upgrade para continuar usando as ferramentas.',
      code:  'TRIAL_EXPIRED',
    });
  }

  return next();
};
