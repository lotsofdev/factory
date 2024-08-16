<?php

namespace Factory;

class Router
{
    protected $routes = []; // stores routes

    public function addRoute(string $method, string $url, \closure $target)
    {
        $this->routes[$method][$url] = $target;
    }

    public function matchRoute()
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $url = $_SERVER['REQUEST_URI'];
        if (isset($this->routes[$method])) {
            foreach ($this->routes[$method] as $routeUrl => $target) {

                $routeParts = explode('/', $routeUrl);
                $urlParts = explode('/', $url);

                $regs = [];
                $values = [];

                foreach ($routeParts as $key => $part) {
                    if ($key == 0 || !isset($urlParts[$key])) {
                        continue;
                    }

                    if (strpos($part, ':') === 0) {
                        $paramName = str_replace(':', '', $part);
                        if (str_ends_with($part, '?')) {
                            $paramName = str_replace('?', '', $paramName);
                            $regs[$paramName] = '(\/[^/]+)?';
                        } else {
                            $regs[$paramName] = '\/[^/]+';
                        }
                        $values[$key] = $urlParts[$key];
                    } else {
                        $regs[$part] = '\/' . $part;
                        $values[$key] = -1;
                    }
                }

                $pattern = '';
                foreach ($regs as $paramName => $reg) {
                    $pattern .= $reg;
                }

                if (preg_match('#^' . $pattern . '$#', $url, $matches)) {
                    $params = array_filter($values, function ($value) {
                        return $value != -1;
                    });
                    call_user_func_array($target, $params);
                    return;
                }
            }
        }
        throw new \Exception('Route not found');
    }
}