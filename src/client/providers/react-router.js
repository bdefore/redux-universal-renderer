import React from 'react';
import { Router } from 'react-router';
import { browserHistory } from 'react-router';
import { ReduxAsyncConnect } from 'redux-async-connect';
import getRoutes from 'universal-redux/routes';

export default function(store, asyncHelpers) {
  const component = (
    <Router render={(props) => <ReduxAsyncConnect {...props} helpers={ asyncHelpers }/>} history={browserHistory}>
      {getRoutes(store)}
    </Router>
  );

  return component;
}
