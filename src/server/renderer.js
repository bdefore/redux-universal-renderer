import React from 'react';
import { Provider } from 'react-redux';
import { RouterContext } from 'react-router';

import path from 'path';
import { match } from 'react-router';
import PrettyError from 'pretty-error';
import createMemoryHistory from 'react-router/lib/createMemoryHistory';

import createStore from '../shared/create';
import configure from '../configure';
import html from './html';
import getTools from './tools';
import { hooks, execute } from '../hooks';

global.__CLIENT__ = false;
global.__SERVER__ = true;
global.__DISABLE_SSR__ = false;  // <----- DISABLES SERVER SIDE RENDERING FOR ERROR DEBUGGING
global.__DEVELOPMENT__ = process.env.NODE_ENV !== 'production';

export default (projectConfig, projectToolsConfig) => {
  const tools = getTools(projectConfig, projectToolsConfig);
  const config = configure(projectConfig);
  const getRoutes = require(path.resolve(config.routes)).default;
  const pretty = new PrettyError();

  return (req, res) => {
    if (__DEVELOPMENT__) {
      // Do not cache webpack stats: the script file would change since
      // hot module replacement is enabled in the development env
      tools.refresh();
    }

    const middleware = config.redux.middleware ? require(path.resolve(config.redux.middleware)).default : [];
    const history = createMemoryHistory();
    const store = createStore(middleware, history);

    if (__DISABLE_SSR__) {
      const content = html(config, tools.assets(), store, res._headers);
      res.status(200).send(content);
    } else {
      match({ history, routes: getRoutes(store), location: req.originalUrl }, (error, redirectLocation, renderProps) => {
        if (redirectLocation) {
          res.redirect(redirectLocation.pathname + redirectLocation.search);
        } else if (error) {
          console.error('ROUTER ERROR:', pretty.render(error));
          res.status(500);
        } else if (renderProps) {
          execute(hooks.server.GENERATE_ROOT_COMPONENT, { store, renderProps }, () => {
            const root = (
              <Provider store={store} key="provider">
                <div>
                  <RouterContext {...renderProps} />
                </div>
              </Provider>
            );
            return { root };
          })
          .then(({ root }) => {
            const content = html(config, tools.assets(), store, res._headers, root);
            res.status(200).send(content);
          })
          .catch((err) => {
            console.error(err);
            res.status(500).send(err);
          });
        } else {
          res.status(404).send('Not found');
        }
      });
    }
  };
};
