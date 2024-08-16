<?php

namespace Factory\Renderers;

function blade(\Lotsof\Components\Component $component, object $config): string
{
    // make sure we have a temp directory to store the cache
    $tmpDir = sys_get_temp_dir();
    $cacheDir = $tmpDir . '/sFactoryBladeCache';
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir);
    }

    // render the view
    $relPath = \Sugar\Fs\relativePath($config->components->rootDir, $component->getPath());
    $viewPath = $relPath . '.' . basename($component->getPath()) . '';
    $blade = new \eftec\bladeone\BladeOne($config->components->rootDir, $cacheDir, \eftec\bladeone\BladeOne::MODE_DEBUG);
    return $blade->run($viewPath, (array) $component->getValues());
}