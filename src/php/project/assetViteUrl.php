<?php

namespace Factory\Project;

function assetViteUrl(string $path): string
{
    global $config;
    $url = '//' . $config->project->server->hostname . ':' . $config->project->server->port . '/@fs' . $path;
    return $url;
}