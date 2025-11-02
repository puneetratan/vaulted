const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './index.web.js',
  output: {
    path: path.resolve(__dirname, 'web-dist'),
    filename: 'bundle.js',
    publicPath: '/',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules\/(?!(react-native-.*|@react-native.*)\/)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              'module:metro-react-native-babel-preset',
            ],
            plugins: [
              'react-native-reanimated/plugin',
            ],
          },
        },
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
        type: 'asset/resource',
      },
    ],
  },
  resolve: {
    extensions: ['.web.js', '.web.tsx', '.web.ts', '.js', '.jsx', '.ts', '.tsx'],
    alias: {
      'react-native$': 'react-native-web',
      'react-native-vector-icons/MaterialIcons': path.resolve(__dirname, 'src/utils/Icon.web.tsx'),
      'react-native-vector-icons': path.resolve(__dirname, 'src/utils/Icon.web.tsx'),
    },
    fallback: {
      'crypto': false,
      'stream': false,
      'buffer': false,
      'util': false,
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
      process: {env: {NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development')}},
    }),
    new (require('html-webpack-plugin'))({
      template: path.join(__dirname, 'public', 'index.html'),
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
  },
};

