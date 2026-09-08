exports.handler = async () => ({
  statusCode: 200,
  headers: {
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify({ now: new Date().toISOString() })
});