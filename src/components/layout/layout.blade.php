<html>

<head>
    <title>Factory - @yield('title')</title>

    @foreach($ui->assets as $asset)
        @if (str_contains($asset, '.css'))
            <link rel="stylesheet" href="{{ $asset }}" />
        @elseif (str_contains($asset, '.js') || str_contains($asset, '.ts'))
            <script type="module" src="{{ $asset }}"></script>
        @endif
    @endforeach

</head>

<body>
    <s-factory verbose></s-factory>
</body>

</html>