(function($, hljs) {

    $(document).ready(function() {

        if ($('.content').length) {

            // Syntax highlighting
            hljs.initHighlightingOnLoad();

            // Add Bootstrap styling to tables
            $('.content table').addClass('table');

            // FitVids
            $('.videoHolder').fitVids();

            $videoCheck = 0;

            // look for an iframe - video parsing...
            $(".content iframe").each(function(index, value) {

                $youtubeURL = $(this).attr("src");
                $youtubeID = $youtubeURL.replace("//www.youtube.com/embed/", "");

                // insert thumbnail
                $thumbnailURL = "http://img.youtube.com/vi/" + $youtubeID + "/maxresdefault.jpg";

                $.getJSON("https://gdata.youtube.com/feeds/api/videos/" + $youtubeID + "?v=2&alt=jsonc")
                    .done(function(api) {

                        // console.log(api);
                        $(".videoThumbnail").css("background-image", "url(" + $thumbnailURL + ")");
                        $(".videoInformation h6").text(api.data.title);
                        $(".videoDuration").text(secondstotime(api.data.duration));
                        $("#show-tutorial-video").attr("href", "http://www.youtube.com/watch?v=" + $youtubeID);

                    });

                $videoCheck = 1;

                $(".videoTutorialBlock").show();


            });

            if ($videoCheck == 0) {
                $(".videoTutorialBlock").hide();
            }

        }

        if ($('.home-categories').length) {
            $('.home-categories').masonry({
                columnWidth: '.col',
                itemSelector: '.col',
                transitionDuration: 0
            });
        }

        function secondstotime(secs) {
            var t = new Date(1970, 0, 1);
            t.setSeconds(secs);
            var s = t.toTimeString().substr(0, 8);
            if (secs > 86399)
                s = Math.floor((t - Date.parse("1/1/70")) / 3600000) + s.substr(2);
            return s;
        }

        // popup
        $('#show-tutorial-video').magnificPopup({
            type: 'iframe'
        });


    });

})(jQuery, hljs);