<?php

/**
 * Simple Router Class
 * Handles routing of API requests
 */
class Router {
    private $routes = [];
    private $middlewares = [];
    
    /**
     * Add a route
     */
    public function addRoute($method, $path, $controller, $action, $middlewares = []) {
        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $path,
            'controller' => $controller,
            'action' => $action,
            'middlewares' => $middlewares
        ];
    }
    
    /**
     * Add GET route
     */
    public function get($path, $controller, $action, $middlewares = []) {
        $this->addRoute('GET', $path, $controller, $action, $middlewares);
    }
    
    /**
     * Add POST route
     */
    public function post($path, $controller, $action, $middlewares = []) {
        $this->addRoute('POST', $path, $controller, $action, $middlewares);
    }
    
    /**
     * Add PUT route
     */
    public function put($path, $controller, $action, $middlewares = []) {
        $this->addRoute('PUT', $path, $controller, $action, $middlewares);
    }
    
    /**
     * Add DELETE route
     */
    public function delete($path, $controller, $action, $middlewares = []) {
        $this->addRoute('DELETE', $path, $controller, $action, $middlewares);
    }
    
    /**
     * Dispatch the request
     */
    public function dispatch() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        // Remove API prefix if present
        if (defined('API_PREFIX') && strpos($path, API_PREFIX) === 0) {
            $path = substr($path, strlen(API_PREFIX));
        }
        
        // Find matching route
        foreach ($this->routes as $route) {
            if ($route['method'] === $method) {
                $params = $this->matchPath($route['path'], $path);
                if ($params !== false) {
                    // Set URL parameters in $_GET
                    foreach ($params as $key => $value) {
                        $_GET[$key] = $value;
                    }
                    
                    // Execute middlewares
                    foreach ($route['middlewares'] as $middleware) {
                        call_user_func($middleware);
                    }
                    
                    // Execute controller action
                    $controller = new $route['controller']();
                    $action = $route['action'];
                    $controller->$action();
                    return;
                }
            }
        }
        
        // No route found
        Response::notFound('Endpoint not found');
    }
    
    /**
     * Match path with route pattern
     * Supports :param syntax for URL parameters
     * Returns array of parameters if match, false otherwise
     */
    private function matchPath($routePath, $requestPath) {
        // Convert route path to regex pattern
        $pattern = preg_replace('/\/:([^\/]+)/', '/(?P<$1>[^/]+)', $routePath);
        $pattern = '#^' . $pattern . '$#';
        
        if (preg_match($pattern, $requestPath, $matches)) {
            // Extract named parameters
            $params = [];
            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $params[$key] = $value;
                }
            }
            return $params;
        }
        
        return false;
    }
}
