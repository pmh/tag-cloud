const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const FaviconsPlugin = require('favicons-webpack-plugin-2')

const isDev = process.env.NODE_ENV !== 'production'
const isProd = process.env.NODE_ENV === 'production'

const devConfig = isDev ? require('./webpack.dev-config.js') : {}
const prodConfig = isProd ? require('./webpack.prod-config.js') : {}

module.exports = {
  ...devConfig,
  ...prodConfig,

  output: {
    path: path.join(__dirname, 'public'),
    filename: '[hash].bundle.js',
    publicPath: '/',
  },

  resolve: {
    ...(devConfig.resolve || {}),
    ...(prodConfig.resolve || {}),
    alias: {
      components: path.resolve(__dirname, 'src/components/'),
      contexts: path.resolve(__dirname, 'src/contexts/'),
      hooks: path.resolve(__dirname, 'src/hooks/'),
      images: path.resolve(__dirname, 'src/images/'),
      pages: path.resolve(__dirname, 'src/pages/'),
      selectors: path.resolve(__dirname, 'src/selectors/'),
      templates: path.resolve(__dirname, 'src/templates/'),
      types: path.resolve(__dirname, 'src/types/'),
      styles: path.resolve(__dirname, 'src/styles/'),
      utils: path.resolve(__dirname, 'src/utils/'),
      ...((devConfig.resolve || {}).alias || {}),
      ...((prodConfig.resolve || {}).alias || {}),
    },
  },

  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /(node_modules)/,
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: { publicPath: '/', hmr: isDev },
          },
          'css-loader',
        ],
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({ template: './index.html', inject: true }),
    new FaviconsPlugin('./src/client/assets/favicon.png'),
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css',
    }),
  ],

  devServer: {
    hot: true,
    historyApiFallback: true,
    inline: true,
    port: 3000,
  },

  devtool: isDev ? 'cheap-module-eval-source-map' : undefined,
}
