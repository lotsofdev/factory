<?php

namespace Factory\Renderer;

// global configuration
$viewsFolder = realpath(__DIR__ . '/..');
$cacheFolder = realpath(__DIR__ . '/cache');

// blade
$blade = new \eftec\bladeone\BladeOne($viewsFolder, $cacheFolder . '/blade', \eftec\bladeone\BladeOne::MODE_DEBUG);

// twig
$twigLoader = new \Twig\Loader\FilesystemLoader($viewsFolder);
$twig = new \Twig\Environment($twigLoader, [
    'cache' => $cacheFolder . '/twig',
]);

function render($view, $data = [], ?string $engine = null): string
{
    global $blade;
    global $twig;
    global $viewsFolder;

    $path = str_replace('.', '/', $view);

    $twigPath = $viewsFolder . '/' . $path . '.twig';
    $bladePath = $viewsFolder . '/' . $path . '.blade.php';

    if ($engine === 'twig' && !file_exists($twigPath)) {
        throw new \Exception('Twig file not found: ' . $twigPath);
    }
    if ($engine === 'blade' && !file_exists($bladePath)) {
        throw new \Exception('Blade file not found: ' . $bladePath);
    }

    if ($engine === 'twig' || file_exists($twigPath)) {
        return $twig->render($path . '.twig', (array) $data);
    }
    if ($engine === 'blade' || file_exists($bladePath)) {
        return $blade->run(str_replace('/', '.', $view), (array) $data);
    }

    throw new \Exception('View file not found: ' . $path);

}
