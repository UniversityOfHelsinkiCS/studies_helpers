const express = require('express');

const courses = require('./data/courses.json');
const stats = require('./data/stats.json');

const app = express();

app.get('/api/courses', (req, res) => {
  res.send(courses);
});

app.get('/api/courses/:name/stats', (req, res) => {
  const { name } = req.params;

  const courseStats = stats[name] || {};

  res.send(courseStats);
});

module.exports = app;
