'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('plans', [
      { name: 'Bronze', price: 49.90,  created_at: new Date(), updated_at: new Date() },
      { name: 'Prata',  price: 99.90,  created_at: new Date(), updated_at: new Date() },
      { name: 'Ouro',   price: 199.90, created_at: new Date(), updated_at: new Date() },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('plans', null, {});
  },
};
