<?php

namespace Factory\Project;

function assetUrl(string $path): string
{
    global $config;

    $url = $path;
    if (str_starts_with($path, 'http') || str_starts_with($path, '.') || str_starts_with($path, '/')) {
        $url = $path;
    } else {
        $url = $config->project->server->protocol . '://' . $config->project->server->hostname . ':' . $config->project->server->port . '/' . $path;
    }

    return $url;
}