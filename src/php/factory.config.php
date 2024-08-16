<?php

namespace Factory\Config;

function get(string $path = '.'): mixed
{
    $factoryConfig = getenv('FACTORY_CONFIG');
    $factoryConfig = json_decode($factoryConfig, false, 512, JSON_THROW_ON_ERROR);

    if ($path === '.') {
        return $factoryConfig;
    }

    $value = \Sugar\Object\get($factoryConfig, $path);
    return $value;
}