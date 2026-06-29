'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { User, Role, Plan, Tool, SystemSetting } = require('../../models');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role_id: user.role_id },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  status: user.status,
  role_id: user.role_id,
  role: user.role?.name,
  plan_id: user.plan_id,
});

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Os campos name, email e password são obrigatórios.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    const prestadorRole = await Role.findOne({ where: { name: 'prestador' } });
    if (!prestadorRole) {
      return res.status(500).json({ error: 'Role padrão não encontrada. Execute os seeders.' });
    }

    // Atribui o plano Free Trial ao novo usuário com 30 dias de validade
    const trialPlan = await Plan.findOne({ where: { name: 'Free Trial' } });

    const trialSetting = await SystemSetting.findOne({ where: { key: 'trial_duration_days' } });
    const trialDays = parseInt(trialSetting?.value, 10) || 30;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // O hook beforeCreate do Model hasheia a senha automaticamente
    const user = await User.create({
      name,
      email,
      password,
      role_id:       prestadorRole.id,
      plan_id:       trialPlan?.id ?? null,
      trial_ends_at: trialPlan ? trialEndsAt : null,
      status: 'active',
    });

    const token = signToken(user);

    // User.create não carrega associações — incluímos role manualmente
    return res.status(201).json({ user: { ...safeUser(user), role: prestadorRole.name }, token });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Os campos email e password são obrigatórios.' });
    }

    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: 'role', attributes: ['name'] }],
    });

    // Mesma mensagem para usuário não encontrado e senha errada (evita enumeração de e-mails)
    if (!user || !(await user.checkPassword(password))) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Conta inativa ou suspensa. Entre em contato com o suporte.' });
    }

    const token = signToken(user);

    return res.status(200).json({ user: safeUser(user), token });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

const FORGOT_MSG = 'Se o e-mail estiver cadastrado, as instruções de recuperação foram enviadas.';

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'O campo email é obrigatório.' });
    }

    const user = await User.findOne({ where: { email } });

    // Retorna a mesma mensagem independente de o e-mail existir (evita enumeração)
    if (!user) {
      return res.status(200).json({ message: FORGOT_MSG });
    }

    // Gera token bruto; armazena apenas o hash SHA-256 no banco
    const rawToken = crypto.randomBytes(20).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    await user.update({
      password_reset_token: hashedToken,
      password_reset_expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
    });

    // TODO: substituir pelo Nodemailer quando o serviço de e-mail for configurado
    console.log(`[RESET LINK] http://localhost:3000/reset-password?token=${rawToken}`);

    return res.status(200).json({ message: FORGOT_MSG });
  } catch (err) {
    console.error('[forgotPassword]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Os campos token e newPassword são obrigatórios.' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        password_reset_token: hashedToken,
        password_reset_expires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    // O hook beforeUpdate hasheia a nova senha automaticamente
    await user.update({
      password: newPassword,
      password_reset_token: null,
      password_reset_expires: null,
    });

    return res.status(200).json({ message: 'Senha redefinida com sucesso.' });
  } catch (err) {
    console.error('[resetPassword]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'password_reset_token', 'password_reset_expires'] },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        {
          model: Plan,
          as: 'plan',
          include: [{
            model: Tool,
            as: 'tools',
            where: { is_active: true },
            required: false,
            through: { attributes: [] },
          }],
        },
      ],
    });

    return res.json({ user });
  } catch (err) {
    console.error('[getProfile]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};
