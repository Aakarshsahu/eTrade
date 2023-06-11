
var nav_con = document.querySelector(".nav-container")
var header = document.querySelector("header")
var top_btn = document.querySelector(".top-btn")

// ---------nav


top_btn.addEventListener("click" ,function(){
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
})
window.onscroll = () => {
    if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
        top_btn.style.display="block"
        header.style.position="fixed";
        header.style.boxShadow="none";
        header.style.background="none";
        nav_con.style.boxShadow="0 0 5px rgb(160, 160, 160)"
        
        } else {
        header.style.position="absolute";
        top_btn.style.display="none"
        nav_con.style.boxShadow="none"
        header.style.background="#fff";
        header.style.boxShadow="0 3px 5px rgb(196, 196, 196)";
        
        }

        function myFunction(x) {
          if (x.matches) { // If media query matches
            header.style.background="#fff";

            nav_con.style.boxShadow="none"
            header.style.boxShadow="0 3px 5px rgb(196, 196, 196)";

          } 
        }
        
        var x = window.matchMedia("(max-width: 500px)")
        myFunction(x) // Call listener function at run time
        x.addListener(myFunction)
}

// -----------------search-------------------

function filterFunction() {
    var input, filter, ul, li, a, i;
    input = document.getElementById("myInput");
    filter = input.value.toUpperCase();
    div = document.getElementById("myDropdown");
    a = div.getElementsByTagName("a");
   
    for (i = 0; i < a.length; i++) {
      txtValue = a[i].textContent || a[i].innerText;
      if (txtValue.toUpperCase().indexOf(filter) > -1) {
        a[i].style.display = "";
      } else {
        a[i].style.display = "none";
      }
    }
  }

  // -------------------------preloder
window.onload = () => {
  document.getElementById("preloder").style.display="none"
}  

// ------------count down

var countDownDate = new Date("2023-05-10T00:00:00Z").getTime();

var x = setInterval(function() {

  var now = new Date().getTime();

  var distance = countDownDate - now;

  var days = Math.floor(distance / (1000 * 60 * 60 * 24));
  var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((distance % (1000 * 60)) / 1000);

  document.querySelector(".countdown-day").textContent = days;
  document.querySelector(".countdown-hour").textContent =hours;
  document.querySelector(".countdown-minute").textContent =minutes;
  document.querySelector(".countdown-second").textContent =seconds;

  // document.getElementById("countdow`n").innerHTML = days + "d " + hours + "h " + minutes + "m " + seconds + "s ";

  if (distance < 0) {
    clearInterval(x);
    document.getElementById("countdown").innerHTML = "EXPIRED";
  }
}, 1000);