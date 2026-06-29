'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('system_settings', [
      {
        key:         'system_name',
        value:       'TISSflow',
        description: 'Nome do sistema exibido na interface e no título do site.',
        created_at:  new Date(),
        updated_at:  new Date(),
      },
      {
        key:         'support_email',
        value:       'suporte@tissflow.com',
        description: 'E-mail de suporte exibido para os usuários.',
        created_at:  new Date(),
        updated_at:  new Date(),
      },
      {
        key:         'trial_duration_days',
        value:       '30',
        description: 'Quantidade de dias do período de teste gratuito para novos cadastros.',
        created_at:  new Date(),
        updated_at:  new Date(),
      },
    ], { ignoreDuplicates: true });
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('system_settings', {
      key: ['system_name', 'support_email', 'trial_duration_days'],
    });
  },
};
