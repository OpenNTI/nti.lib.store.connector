import '@nti/style-common/variables.css';
import '@nti/style-common/all.scss';

export const parameters = {
  actions: { argTypesRegex: "^on[A-Z].*" },
}

window.$AppConfig = window.$AppConfig || { server: '/dataserver2/' };
