There is a title that carries across all pages of the current application saying “Hershey History Hunt”. Under that statement change “Where was this?” to be “Where and when was this?”

Make these changes to the first screen of the application that we can call the launch page:
Please remove the words “Volunteer Edition”.
On the very first screen instead of "Step into 1910", say "When and where is this in Hershey History?"
Change the sentence “ Look at the historic photo, then click on the map where you think it was taken. You'll see what it looks like today and learn the story.” to “Test your Hershey history knowledge! Guess the date and location of Hershey History Center’s archive photo to score points and unlock present-day views.”  NOTE that this has an embedded hyperlink. We want people to be able to click on that link.
Drop the boxes under “Start Hunt ->” (see image1.png)
The screen currently has three boxes, 1. study the photo, 2. drop your pin, and 3. learn the story. Add "guess the year" box between the current 2 and 3.
On the first screen drop the “Works for older volunteers” from the information block next to start hunt. Increase the font size of that text to make it easier to read. Because the game may have more than 4 sites in the future, make sure that number in this spot will change to the number of images the game is using in each release.
On the first screen the bottom line starting with “Made for Hershey HIstory Center …”, line to just say “The Hershey-Derry Township Historical Society,40 Northeast Drive, Hershey, PA 17033”

Once the game is started, two screens are displayed. We can call the first page the guess page, and the second the answer page. While the guess and answer pages are different, each guess page will have the same format and each answer page will have the same format.  The information displayed on both pages will come from a JSON file that either has the data or links to pictures.

Make these changes to the common format of the Guess pages:
The application has the option to view the current photo by using the control within the picture frame to see how it appears today.  We want to remove the drag option from the first screen and ONLY show the old photo.  Note will want to keep the slider on the answer pages that follow. 
Add a text box where the user can type in a date.
Do not tell the user the name of as shown in the image below, just have the header say “Hint”
(see image2.png)
A hint will be in included in the JSON files that should be displayed instead of the name. In the example above, “The Hotel Hershey” would be the hint from the JSON file and if isn’t in the file say “No hint for this one.” 

Make these changes to the common format of the answer pages:
The Date Unknown should be the date that can be found in the JSON file. If it is Date Unknown now because it doesn’t have a date, that is correct.  
Build this page in a way that it can scroll up and down and see different sections. If there is a cleaner approach than my scrolling suggestion, please propose it.
Section One: Then and Now photo slider:

(see image3.png)
On this drop the “Volunteer Contribution Enabled”
Drop today from the Hershey Hotel and use a date from the JSON file for the year the “Today” picture was taken.
Section Two: Map and location answer. 
If possible have the two boxes below next to each other horizontally. That may make it easier to be scrolling the whole page down those set of subpages.
(see image4.png)
Remove the “Click map to place pin” above the map box, and remove “Click to guess” in the map box. It isn’t needed on the answer page.
Add the mile notation for how far off their guess was off down to tenths of a mile. Round in the was that is best for the user.
Section 3: More historical images
A box that with links to the Past Perfect application with the search filled in to find more images. These links will be in the JSON file.
Section 4: Historical Insight. 
The text will come from the JSON file, and if it is missing display “No history provided.” If the text is long, it should be possible to scroll within that box. This can be a second scroll bar in that box, or the one on the main page, which ever approach leads to the cleanest web design.
Game scoring:
Location: 1000 points are possible. Subtract 100 points for each tenth of a mile away from the location.
Year: 100 points possible. Subtract 1 point for each year away. If we don’t provide a date in the JSON file, 100 points is awarded.

Drop this from the “Hunt Complete!” Page:

(see image5.png)