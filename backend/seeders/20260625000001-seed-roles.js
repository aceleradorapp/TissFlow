'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('roles', [
      { name: 'visitante',    created_at: new Date(), updated_at: new Date() },
      { name: 'prestador',   created_at: new Date(), updated_at: new Date() },
      { name: 'proprietario', created_at: new Date(), updated_at: new Date() },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('roles', null, {});
  },
};
