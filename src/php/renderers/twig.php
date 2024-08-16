<?php

namespace Factory\Renderers;

function twig(object $component, object $config): string
{
    // make sure we have a temp directory to store the cache
    $tmpDir = sys_get_temp_dir();
    $cacheDir = $tmpDir . '/sFactoryTwigCache';
    if (!is_dir($cacheDir)) {
        mkdir($cacheDir);
    }

    $twigLoader = new \Twig\Loader\FilesystemLoader($config->components->rootDir);
    $twig = new \Twig\Environment($twigLoader, [
        // 'cache' => $cacheDir,
    ]);

    // render the view
    $relPath = \Sugar\Fs\relativePath($config->components->rootDir, $component->getPath());
    $viewPath = $relPath . '/' . basename($component->getPath()) . '.twig';
    return $twig->render($viewPath, \Sugar\Convert\toArray($component->getValues()));
}