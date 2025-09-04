// Simple performance monitoring utility
export function performanceMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, url, statusCode } = req;
    
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${statusCode} - ${duration}ms`);
    
    // Log slow requests
    if (duration > 1000) {
      console.warn(`⚠️  Slow request detected: ${method} ${url} took ${duration}ms`);
    }
  });
  
  next();
}

export function logDatabaseQuery(query, params, duration) {
  console.log(`[DB] Query executed in ${duration}ms:`, query.substring(0, 100) + '...');
  
  if (duration > 500) {
    console.warn(`⚠️  Slow database query detected: ${duration}ms`);
  }
}
