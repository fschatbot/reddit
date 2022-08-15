// https://www.reddit.com/subreddits/search.json?q=...
let afterid = "";
let posts_container = document.getElementById("posts");
let cooldown = true;
let subreddit = localStorage.getItem("default_subreddit") || "memes";
let prev_posts = [];
let sort_hot = localStorage.getItem("hotshot") == "1" ? true : false;

function ErrorHandler(err) {
	document.body.innerHTML += "There has been a problem with your fetch operation: " + err;
	console.error(err);
}

function handle_response(raw_data) {
	if (raw_data.error) throw new Error(raw_data.reason);
	data = raw_data.data;
	afterid = data["after"];
	posts = data["children"];
	let timeout = 100;
	nsfw_str = '<label class="nsfwTag">nsfw</label>';
	posts.slice(2).forEach((post, index) => {
		post = post["data"];
		// Generates a unquie post id using the post link
		let post_id = post["permalink"].replace(`r/${subreddit}/comments`, "").replace(/\//g, "");
		// Exclude it if it's a video or it has been already displayed. If the url also matches the post link
		if (
			post["is_video"] ||
			prev_posts.indexOf(post_id) > -1 ||
			post["url"] == `http://www.reddit.com${post["permalink"]}`
		)
			return;
		// Handle the post itself. If it's an image use the img tag otherwise use the embed tag
		let img_elem;
		if (post["domain"] == "i.reddit.it" || post["domain"] == "i.redd.it") {
			img_elem = new Image();
			img_elem.alt = post["url"];
			img_elem.onerror = imageNotFound;
		} else if (post.domain == "redgifs.com") {
			img_elem = document.createElement("iframe");
			post["url"] = post["url"].replace("/watch/", "/ifr/");
		} else if (post.domain == "i.imgur.com") {
			// IMGUR DOESN'T LOAD FOR SOME REASON
			post.url = post.preview.images[0].source.url.replace("amp;", "");
			img_elem = new Image();
			img_elem.alt = post["url"];
			img_elem.onerror = imageNotFound;
		} else {
			console.log(post["domain"], post["url"]);
			img_elem = document.createElement("embed");
			// Doesn't seem to work!!
			img_elem.addEventListener("error", imageNotFound);
			img_elem.onerror = imageNotFound;
		}
		img_elem.src = post["url"];
		img_elem.setAttribute("class", "image");
		// Create the post element
		let post_elem = GeneratePost({
			title: post["title"],
			isNSFW: post["over_18"],
			author: post["author"],
			timestamp: post["created_utc"],
			ImgElem: img_elem,
			url: post["url"],
			redirect: `http://www.reddit.com${post["permalink"]}`,
		});
		// Add animation delay
		post_elem.style.animationDelay = `${index * timeout}ms`;
		posts_container.appendChild(post_elem);
		prev_posts.push(post_id);
	});
	UpdatePostVisibility();
}

// NSFW ELEMENT
let NSFWelem = document.createElement("label");
NSFWelem.setAttribute("class", "nsfwTag");
NSFWelem.innerText = "nsfw";

const GeneratePost = ({ title, author, timestamp, isNSFW = false, ImgElem, redirect }) => {
	// TODO: Add the timestamp
	let post = document.createElement("div");
	post.setAttribute("class", "post");
	post.setAttribute("nsfw", isNSFW.toString());
	let nsfw_str = '<label class="nsfwTag">nsfw</label>';
	let post_info = `<p class="info">Posted by <a href="https://www.reddit.com/user/${author}/" target="_blank">u/${author}</a></p>`;
	let post_title = `<h2 class="title"><a href="${redirect}" target="_blank">${title}</a>${
		isNSFW ? nsfw_str : ""
	}</h2>`;
	post.innerHTML = `${post_info}${post_title}${ImgElem.outerHTML}`;
	return post;
	/*
	This creates a container that looks something like this:
	<div class="post">
		<p class="info">Posted by <a href="https://www.reddit.com/user/..." target="_blank">u/author</a></p>
		<h2 class="title"><a href="http://www.reddit.com/r/memes/comments/..." target="_blank">TITLE</a></h2>
		<img src="http://i.imgur.com/..." alt="http://i.imgur.com/..." class="image">
	</div>

	// METHOD 2:
	// Creating the container
	const post = document.createElement("div");
	post.setAttribute("class", "post");
	post.setAttribute("nsfw", nsfw.toString());
	// Creating the title
	let title_elem = document.createElement("h2");
	title_elem.setAttribute("class", "title");
	// Create Title Link
	let title_link = document.createElement("a");
	title_link.setAttribute("href", redirect);
	title_link.setAttribute("target", "_blank");
	title_link.innerText = title;
	title_elem.appendChild(title_link);
	// Add the NSFW Tag if nessasary
	if (isNSFW) title_elem.appendChild(NSFWelem.cloneNode(true));
	// Creating the info
	let info_elem = document.createElement("p");
	info_elem.setAttribute("class", "info");
	info_elem.innerHTML = `Posted by `;
	// Create the author link
	let author_elem = document.createElement("a");
	author_elem.setAttribute("href", `https://www.reddit.com/user/${author}/`);
	author_elem.setAttribute("target", "_blank");
	author_elem.innerText = `u/${author}`;
	info_elem.appendChild(author_elem);
	// Appending the elements
	post.appendChild(info_elem);
	post.appendChild(title_elem);
	post.appendChild(ImgElem);
	return post;
	
	 */
};

function imageNotFound(err) {
	// Remove any post which cannot be handled
	err.srcElement.parentElement.remove();
}

async function new_posts(subreddit, afterid) {
	// return // This prevents new posts from loading in
	console.log(new Date().toString(), ": Loading new posts...");
	let type = sort_hot ? "hot" : "new";
	let url = `https://www.reddit.com/r/${subreddit}/${type}.json?sort=${type}`;
	if (afterid) {
		url += `&after=${afterid}`;
	}
	await fetch(url)
		.then((r) => r.json())
		.then(handle_response)
		.catch((err) => {
			ErrorHandler(err);
			cooldown = false;
		});
}

window.addEventListener("DOMContentLoaded", async () => {
	posts_container = document.getElementById("posts");
	if (localStorage.getItem("hotshot") == null) {
		localStorage.setItem("hotshot", "1");
		sort_hot = true;
	}
	add_eventlisteners();
	// cooldown = true;
	// await new_posts(subreddit, afterid);
	// cooldown = false;
	window.scrollTo({
		top: 0,
		behavior: "smooth",
	});
});

window.onscroll = async function (ev) {
	if (
		window.innerHeight + window.scrollY >= document.body.offsetHeight - window.innerHeight &&
		cooldown == false
	) {
		// you're at the bottom of the page
		cooldown = true;
		await new_posts(subreddit, afterid, true);
		// When we reach the end of the subreddit the afterid returned is `null` hence we shall set the cooldown to true to prevent more posts from loading
		cooldown = afterid == null;
	}
};

// Filter posts
let filtering = "all";

function PostFilter(type) {
	filtering = type;
	UpdatePostVisibility();
}

function UpdatePostVisibility() {
	let posts = [...document.querySelectorAll(".post")];
	if (filtering == "all") {
		posts.forEach((elem) => elem.classList.remove("hide"));
	} else if (filtering == "nsfw") {
		posts.forEach((elem) => {
			if (elem.getAttribute("nsfw") == "true") {
				elem.classList.remove("hide");
			} else {
				elem.classList.add("hide");
			}
		});
	} else if (filtering == "sfw") {
		posts.forEach((elem) => {
			if (elem.getAttribute("nsfw") == "false") {
				elem.classList.remove("hide");
			} else {
				elem.classList.add("hide");
			}
		});
	}
}

function PostSort(ishot) {
	res = confirm(`Are you sure you want to now show posts from ${ishot ? "hot" : "new"}?`);
	if (res) {
		sort_hot = ishot;
		localStorage.setItem("hotshot", ishot ? "1" : "0");
		// Resetting the stuff
		afterid = "";
		prev_posts = [];
		cooldown = false;
		posts_container.innerHTML = "";
		new_posts(subreddit, afterid, sort_hot);
	}
}

// Handling the subreddit changes

function add_eventlisteners() {
	let subreddit_manager = document.getElementById("subreddit");
	subreddit_manager.value = subreddit;

	subreddit_manager.addEventListener("keyup", (event) => {
		if (event.key === "Enter" || event.keyCode === 13) {
			change_subreddit(subreddit_manager.value);
		}
	});

	document.getElementById("subreddit_submit").addEventListener("click", () => {
		change_subreddit(subreddit_manager.value);
	});

	function change_subreddit(new_subreddit) {
		if (!new_subreddit) {
			alert("Sorry, but a subreddit is required");
			subreddit_manager.focus();
		} else {
			let action = confirm(
				"Are you sure you want to proceed with the following action! Any scrolling done so far cannot be recovered"
			);
			if (action) {
				localStorage.setItem("default_subreddit", new_subreddit);
				// Resetting the stuff
				afterid = "";
				subreddit = new_subreddit;
				prev_posts = [];
				cooldown = false;
				posts_container.innerHTML = "";
				new_posts(subreddit, afterid);
			}
		}
	}

	document.getElementById("new_posts").addEventListener("click", () => {
		if (cooldown == false) {
			cooldown = true;
			new_posts(subreddit, afterid);
			cooldown = false;
		}
	});

	document.getElementById(sort_hot ? "hot" : "new").setAttribute("checked", true);
	console.log("Added event listeners");
}
