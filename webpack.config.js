const { resolve } = require('path');
const webpackMerge = require('webpack-merge');
const compression = require('compression-webpack-plugin');
const html = require('html-webpack-plugin');
const copy = require('copy-webpack-plugin');
const extract = require('extract-text-webpack-plugin');
const portfinder = require('portfinder');

module.exports = function(options, webpackOptions) {
  options = options || {};

  let config = {};

  config = webpackMerge({}, config, {
    context: __dirname,
    entry: {
      app: root('src/js/app.js')
    },
    resolve: { extensions: ['.js'] },
    target: 'web',
    output: {
      path: root('dist'),
      filename: '[name].js'
    },
    module: {
      rules: [
        { test: /\.json$/, loader: 'json-loader' },
        { test: /\.(jp?g|png|gif)$/, loader: 'file-loader', options: { hash: 'sha512', digest: 'hex', name: 'images/[hash].[ext]' } },
        { test: /\.(eot|woff2?|svg|ttf|otf)([\?]?.*)$/, loader: 'file-loader', options: { hash: 'sha512', digest: 'hex', name: 'fonts/[hash].[ext]' } }
      ]
    },
    plugins: [
      new html({ template: root('src/index.html'), output: root('dist') }),
      new copy([{ context: './src/public/', from: '**/*' }])
    ],
    stats: {
      warnings: false
    }
  });

  if (webpackOptions.p) {
    config = webpackMerge({}, config, getProductionPlugins());
    config = webpackMerge({}, config, getProdStylesConfig());
  } else {
    config = webpackMerge({}, config, getDevStylesConfig());
  }

  if (options.serve) {
    return portfinder.getPortPromise().then(port => {
      config.devServer.port = port;
      return config;
    });
  } else {
    return Promise.resolve(config);
  }
};

function getDevStylesConfig() {
  return {
    module: {
      rules: [
        { test: /\.scss$|\.sass$/, use: ['style-loader', 'css-loader', 'sass-loader'], include: [root('src/sass') ] }
      ]
    }
  };
}

function getProdStylesConfig() {
  return {
    plugins: [
      new extract('css/[name].css')
    ],
    module: {
      rules: [
        { test: /\.scss$|\.sass$/, loader: extract.extract({ fallback: 'style-loader', use: ['css-loader', 'sass-loader'] }) },
      ]
    }
  };
}

function getProductionPlugins() {
  return {
    plugins: [
      new compression({ asset: "[path].gz[query]", algorithm: "gzip", test: /\.js$|\.html$/, threshold: 10240, minRatio: 0.8 })
    ]
  }
}

function root(filePath) {
  return resolve(__dirname, filePath);
}
