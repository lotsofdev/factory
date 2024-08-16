<?php

// Load all dependencies
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/_autoload.php';
require_once __DIR__ . '/router/Router.php';
require_once __DIR__ . '/project/_requires.php';
require_once __DIR__ . '/renderers/_requires.php';

// load the project vendors
if (file_exists($_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php')) {
    require_once $_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php';
}

// load the config
$config = \Factory\Config\get();

// create a components instance
$components = new \Lotsof\Components\Components($config);

// load the components index.php if exists
if (file_exists($config->components->rootDir . '/index.php')) {
    require_once $config->components->rootDir . '/index.php';
}

// load all components
$files = glob(__DIR__ . '/../components/**/*.component.php');
foreach ($files as $file) {
    require_once $file;
}

// init the router
$router = new \Factory\Router();

$router->addRoute('GET', '/component/:name/:engine?', function (string $name) {
    global $config;

    // try to find the component
    if (!file_exists($config->components->rootDir . '/' . $name)) {
        throw new \Exception('Component "' . $name . '" not found');
    }

    print \Components\Renderer\render('component.component', [
        'name' => $name,
        'ui' => $config->ui
    ]);
    exit;
});

$router->addRoute('POST', '/api/render/:name/:engine', function (string $name, ?string $engine = '') {

    global $config;
    global $components;

    // get the raw POST data
    $rawData = file_get_contents("php://input");
    $postedData = json_decode($rawData);

    // get the component
    $component = $components->getComponent($name);
    $engines = $component->getEngines();
    $mocks = $component->getMocks();

    if (isset($postedData->values)) {
        $component->setValues($postedData->values);
    }

    // set the default engine if not passed in url
    if ($engine === '') {
        $engine = $engines[0];
    }

    // check if the engine is supported
    if (!in_array($engine, $engines)) {
        throw new \Exception('Engine "' . $engine . '" not supported on the component "' . $name . '". Here are the supported engines: ' . implode(', ', $engines));
    }

    // preparing mock data
    if (!$component->hasValues()) {
        switch ($engine) {
            case 'blade':
            case 'twig':
            case 'component':
                if (isset($mocks[$engine])) {
                    $values = require $mocks[$engine];
                    $component->setValues($values);
                } else {
                    throw new \Exception('No mock data found for the engine "' . $engine . '" on the component "' . $name . '".');
                }
                break;
            case 'react':
                // $data = [];
                break;
        }
    }

    // switch on the engines
    $html = '';
    switch ($engine) {
        case 'blade':
            $html = \Factory\Renderers\blade($component, $config);
            break;
        case 'twig':
            $html = \Factory\Renderers\twig($component, $config);
            break;
        case 'react':
            $html = \Factory\Renderers\react($component, $config);
            break;
    }

    // add the assets from the project
    foreach ($config->project->assets as $asset) {

        // build correct url
        $url = \Factory\Project\assetUrl($asset);

        // add the asset to the html
        if (str_contains($asset, '.css')) {
            $html .= '<link rel="stylesheet" href="' . $url . '">';
        } else if (str_contains($asset, '.js') || str_contains($asset, '.ts')) {
            $html .= '<script type="module" src="' . $url . '"></script>';
        }
    }

    print json_encode((object) [
        'html' => $html,
        'values' => $component->getValues()
    ]);

    exit;
});

$router->addRoute('GET', '/api/specs', function () {

    // try to find the component
    global $config;
    global $components;

    $componentsList = $components->getComponentsListObject();

    print json_encode((object) [
        'components' => $componentsList,
        'config' => $config
    ]);


    exit;
});

$router->matchRoute();


