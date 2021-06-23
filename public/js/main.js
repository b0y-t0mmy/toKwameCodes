let navabr = $(".navbar");

$(window).scroll(function () {
    let oTop = $(".section-2").offset().top - window.innerHeight;
    console.log(oTop);
    if ($(window).scrollTop() > oTop) {
        navabr.addClass("sticky");
    } else {
        navabr.removeClass("sticky");
    }
});


var myVar;
function myFunction() {
    myVar = setTimeout(showPage, 1000)
}

function showPage() {
    document.getElementById('preloader').style.display = 'none';
    document.getElementById('myDiv').style.display = 'block';
}



