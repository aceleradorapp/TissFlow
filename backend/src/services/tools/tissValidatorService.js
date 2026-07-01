'use strict';

/**
 * tissValidatorService.js — thin delegation shim
 *
 * All validation logic lives in tissCoreValidatorService.js.
 * This file exists for backward compatibility with existing imports.
 */

const core = require('./tissCoreValidatorService');

exports.validateXml = core.validate;
