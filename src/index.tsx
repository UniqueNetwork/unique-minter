import { StrictMode } from 'react';
import ReactDOM from 'react-dom';
import AppRoutes from './AppRoutes';

import { GlobalStyle } from './styles';

import './styles/variables.scss';

ReactDOM.render(
  <StrictMode>
    <GlobalStyle />
    <AppRoutes />
  </StrictMode>,
  document.getElementById('root')
);
