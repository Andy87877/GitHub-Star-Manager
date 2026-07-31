/**
 * app.js
 * Application Entry Point. Bootstraps the MVC structure.
 */

import { StarModel } from './models/StarModel.js';
import { StarView } from './views/StarView.js';
import { StarController } from './controllers/StarController.js';

document.addEventListener('DOMContentLoaded', () => {
  const model = new StarModel();
  const view = new StarView();
  const controller = new StarController(model, view);

  controller.init();
});
