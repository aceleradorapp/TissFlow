'use strict';

module.exports = {
  async up(queryInterface) {
    const existing = await queryInterface.sequelize.query(
      "SELECT slug FROM tools WHERE slug IN ('swagger-visual', 'xml-generator')",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const existingSlugs = existing.map((r) => r.slug);

    const toInsert = [
      {
        name:        'Swagger Visual TISS',
        slug:        'swagger-visual',
        description: 'Navegador interativo da estrutura XSD do padrão TISS, com inspeção de tipos, restrições e ocorrências.',
        is_active:   true,
        created_at:  new Date(),
        updated_at:  new Date(),
      },
      {
        name:        'Gerador de Amostras XML/JSON',
        slug:        'xml-generator',
        description: 'Gerador contextualizado de amostras XML e JSON para transações TISS, com seleção granular de campos opcionais.',
        is_active:   true,
        created_at:  new Date(),
        updated_at:  new Date(),
      },
    ].filter((t) => !existingSlugs.includes(t.slug));

    if (toInsert.length > 0) {
      await queryInterface.bulkInsert('tools', toInsert);
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "DELETE FROM tools WHERE slug IN ('swagger-visual', 'xml-generator')",
    );
  },
};
