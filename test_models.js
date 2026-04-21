const apiKey = "AIzaSyDYW4Xxqsdp_KN3tLMGrf06BCZzWWzuoio";

async function checkModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
      console.log(data.models.map(m => m.name).join("\n"));
    } else {
      console.log(data);
    }
  } catch(e) {
    console.error(e);
  }
}

checkModels();
