'use strict';

const { UniqueConstraintError } = require('sequelize');
const { User, Role, Plan, Tool } = require('../../models');

const VALID_STATUSES = ['active', 'inactive', 'suspended'];

const userIncludes = [
  { model: Role, as: 'role', attributes: ['id', 'name'] },
  { model: Plan, as: 'plan', attributes: ['id', 'name', 'price'] },
];

exports.listUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password', 'password_reset_token', 'password_reset_expires'] },
      include: userIncludes,
      order: [['created_at', 'ASC']],
    });

    return res.status(200).json({ users });
  } catch (err) {
    console.error('[listUsers]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Status inválido. Valores permitidos: ${VALID_STATUSES.join(', ')}.`,
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Impede que o proprietário desative a si mesmo
    if (user.id === req.user.id && status !== 'active') {
      return res.status(400).json({ error: 'Você não pode alterar o status da sua própria conta.' });
    }

    await user.update({ status });

    return res.status(200).json({ message: `Status atualizado para '${status}' com sucesso.`, userId: user.id, status });
  } catch (err) {
    console.error('[updateUserStatus]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // O hook beforeUpdate hasheia a senha automaticamente
    await user.update({ password: newPassword });

    return res.status(200).json({ message: 'Senha redefinida com sucesso.', userId: user.id });
  } catch (err) {
    console.error('[resetUserPassword]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// ─── Planos ───────────────────────────────────────────────────────────────────

exports.listPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll({
      include: [{
        model: Tool,
        as: 'tools',
        through: { attributes: [] },
        required: false,
      }],
      order: [['id', 'ASC']],
    });
    return res.status(200).json({ plans });
  } catch (err) {
    console.error('[listPlans]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

exports.updateUserPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_id } = req.body; // null = remover plano

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    if (plan_id != null) {
      const plan = await Plan.findByPk(plan_id);
      if (!plan) return res.status(404).json({ error: 'Plano não encontrado.' });
    }

    await user.update({ plan_id: plan_id ?? null });

    return res.status(200).json({
      message: plan_id != null ? 'Plano atualizado com sucesso.' : 'Plano removido com sucesso.',
      userId: user.id,
      plan_id: plan_id ?? null,
    });
  } catch (err) {
    console.error('[updateUserPlan]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// ─── Ferramentas ──────────────────────────────────────────────────────────────

exports.createTool = async (req, res) => {
  try {
    const { name, slug, description, is_active } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Os campos name e slug são obrigatórios.' });
    }

    const tool = await Tool.create({ name, slug, description, is_active });

    return res.status(201).json({ tool });
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      return res.status(409).json({ error: `O slug '${req.body.slug}' já está em uso.` });
    }
    console.error('[createTool]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

exports.listTools = async (req, res) => {
  try {
    const tools = await Tool.findAll({ order: [['name', 'ASC']] });
    return res.status(200).json({ tools });
  } catch (err) {
    console.error('[listTools]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// ─── Associação Plano ↔ Ferramentas ──────────────────────────────────────────

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_name } = req.body;

    const VALID_ROLES = ['proprietario', 'prestador'];
    if (!role_name || !VALID_ROLES.includes(role_name)) {
      return res.status(400).json({
        error: `Role inválida. Valores permitidos: ${VALID_ROLES.join(', ')}.`,
      });
    }

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Você não pode alterar o tipo da sua própria conta.' });
    }

    const role = await Role.findOne({ where: { name: role_name } });
    if (!role) return res.status(400).json({ error: `Role '${role_name}' não encontrada.` });

    await user.update({ role_id: role.id });

    return res.status(200).json({
      message: `Tipo alterado para '${role_name}' com sucesso.`,
      userId: user.id,
      role: role_name,
    });
  } catch (err) {
    console.error('[updateUserRole]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// ─── Ferramentas (feature management) ────────────────────────────────────────

exports.listFeatures = async (req, res) => {
  try {
    const features = await Tool.findAll({
      include: [{
        model:    Plan,
        as:       'plans',
        attributes: ['id', 'name', 'price'],
        through:  { attributes: [] },
        required: false,
      }],
      order: [['id', 'ASC']],
    });
    return res.status(200).json({ features });
  } catch (err) {
    console.error('[listFeatures]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

exports.updateFeature = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, plan_ids } = req.body;

    const tool = await Tool.findByPk(id);
    if (!tool) return res.status(404).json({ error: 'Ferramenta não encontrada.' });

    if (typeof is_active === 'boolean') {
      await tool.update({ is_active });
    }

    if (Array.isArray(plan_ids)) {
      await tool.setPlans(plan_ids);
    }

    // Retorna a ferramenta atualizada com os planos associados
    const updated = await Tool.findByPk(id, {
      include: [{
        model:    Plan,
        as:       'plans',
        attributes: ['id', 'name', 'price'],
        through:  { attributes: [] },
        required: false,
      }],
    });

    return res.status(200).json({ feature: updated });
  } catch (err) {
    console.error('[updateFeature]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// ─── Associação Plano ↔ Ferramentas (legacy) ─────────────────────────────────

exports.setPlanTools = async (req, res) => {
  try {
    const { planId } = req.params;
    const { toolIds } = req.body;

    if (!Array.isArray(toolIds)) {
      return res.status(400).json({ error: 'O campo toolIds deve ser um array de IDs.' });
    }

    const plan = await Plan.findByPk(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado.' });
    }

    // setTools substitui TODOS os vínculos existentes pelos novos de uma só vez
    await plan.setTools(toolIds);

    const updated = await plan.getTools({ attributes: ['id', 'name', 'slug'] });

    return res.status(200).json({
      message: `Ferramentas do plano '${plan.name}' atualizadas com sucesso.`,
      plan: { id: plan.id, name: plan.name },
      tools: updated,
    });
  } catch (err) {
    console.error('[setPlanTools]', err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};
