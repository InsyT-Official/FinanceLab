const express = require('express');
const path = require('path');
require('dotenv').config();

const indexRoutes = require('./routes/index.routes');
const apiRoutes = require('./routes/api.routes');
const reportRoutes = require('./routes/report.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));
// Expose selected node_modules as /vendor for local browser assets (avoids CDN/tracking issues)
app.use('/vendor', express.static(path.join(__dirname, 'node_modules')));

// Routes
app.use('/', indexRoutes);
app.use('/api', apiRoutes);
app.use('/report', reportRoutes);

// Server
app.listen(PORT, () => {
  console.log(`Server is up and running Oyama bro on http://localhost:${PORT}`);
});

module.exports = app;
