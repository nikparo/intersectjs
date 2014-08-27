intersect.js
===========

JQuery plugin for boolean div and element intersection.

Demo: www.nikparo.com/intersectjs/

Tips:
- Call .intersect() on the object that is changing. Can also be called on both intersecting divs...
<!-- - It's usually best to call .intersect() on a div that's fixed. (Depends on content, background colours etc..) -->
- use data-intersect-class to set custom classes for different clipping objects.
- Using position: fixed on elements within an 'intersect' div breaks it out of the hierarchy. (Since intersect.js uses absolutely positioned divs to create the new intersect content.)
- Therefore, if something needs to be absolutely fixed, create a fixed container and position the clipping content absolutely or relatively within that. (This could be fixed by adding absolute style to the created div elements... bit of a ball-ache though.)
- Call .intersect() on classes or ID's? does classes work with many?

css:
.bigtext-container {
	position: absolute; // Could also be fixed or relative.
}



Syntax example:
<div class="intersect-container">
	<div class="bigtext">Classes work and are copied over</div>
	<span>Some other content can go here too.</span>
</div>

<div class="page">
	<div class="bigpage">
	<div data-intersect-class="box1clip" class="box1 clip"></div>
	</div>
</div>



When the script is run, the '.bigtext-container' is appended, and the syntax becomes:
<div class="intersect-container">
	<div class="bigtext">Classes work and are copied over</div>
	<span>Some other content can go here too.</span>
	<div class="intersect-mask box1clip">
		<div class="intersect-content">.
			<div class="bigtext">Classes work and are copied over</div>
			<span>Some other content can go here too.</span>
		</div>
	</div>
</div>



Before your </body> tag, include:

<script src="https://rawgit.com/nikparo/intersectjs/master/intersect.js"></script>

<script>
	$( document ).ready(function() {

		var clip = $('.intersect-container').intersect({
			elements: '.clip',
			delayedUpdate: 10, // If set, updates the clip again after the last event is fired. Workaround for some browsers, preventing clips that are stuck in the wrong position.
			updateTimeout: 10 // intersects won't update more often than this, in milliseconds. Good for events.
		});

		$(window).scroll(function(div) { // Could also be e.g. $('.page').scroll(function(div) {
			clip.refresh(); // This is a quick position refresh.
		});

		$(window).resize(function() { 
			clip.refreshShape();
		});

	});
</script>