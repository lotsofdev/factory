<html>

<head>
    <title>Factory - @yield('title')</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    @foreach($ui->assets as $asset)
        @if (str_contains($asset, '.css'))
            <link rel="stylesheet" href="{{ $asset }}" />
        @elseif (str_contains($asset, '.js') || str_contains($asset, '.ts'))
            <script type="module" src="{{ $asset }}"></script>
        @endif
    @endforeach

</head>

<body>
    <s-factory id="s-factory" verbose></s-factory>
</body>

</html>