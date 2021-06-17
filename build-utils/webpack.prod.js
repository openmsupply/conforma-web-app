const commonPaths = require('./common-paths')
const webpack = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const config = {
  mode: 'production',
  output: {
    filename: 'static/[name].[hash].js'
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.less$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader
          },
          'css-loader',
          'less-loader'
        ]
      },
    ]
  },
  resolve: {
    alias: {
      '@formatjs/icu-messageformat-parser':'@formatjs/icu-messageformat-parser/no-parser',
    },
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash:4].css'
    })
  ]
};
module.exports = config
