import json
import requests

REPO = "daogemm/daogemm.github.io"
OUTPUT_FILE = "data/songs.json"

def download_file(path):
    url = f"https://api.github.com/repos/{REPO}/contents/files/infos/{path}"
    response = requests.get(url, timeout=10)
    if response.status_code == 200:
        data = response.json()
        download_url = data['download_url']
        file_response = requests.get(download_url, timeout=10)
        return file_response.text
    return None

def load_songs():
    with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_songs(songs):
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(songs, f, ensure_ascii=False, indent=4)

def convert_duration(seconds_str):
    if not seconds_str:
        return ""
    try:
        return int(float(seconds_str))
    except:
        return ""

def main():
    print("Downloading infos.json from GitHub...")
    infos_content = download_file("infos.json")
    if not infos_content:
        print("Failed to download infos.json")
        return
    
    infos = json.loads(infos_content)
    print(f"Loaded {len(infos)} song entries from infos.json")
    
    songs = load_songs()
    print(f"Loaded {len(songs)} songs from local songs.json")
    
    difficulties = ['EZ', 'HD', 'IN', 'AT']
    updated_count = 0
    
    for song in songs:
        song_id = song['id']
        
        web_id = song_id + ".0"
        if web_id not in infos:
            web_id_alt = song_id
            if web_id_alt not in infos:
                print(f"  Not found: {song_id}")
                continue
        
        info = infos.get(web_id) or infos.get(web_id_alt)
        if not info:
            continue
        
        new_data = {}
        
        if info.get('date'):
            new_data['update_date'] = info['date']
        
        if info.get('version'):
            new_data['version'] = info['version']
        
        if info.get('BPM'):
            new_data['bpm'] = info['BPM']
        
        if info.get('duration'):
            new_data['duration'] = convert_duration(info['duration'])
        
        charts = {}
        for diff in difficulties:
            if diff in info and info[diff]:
                diff_data = {}
                
                if info[diff].get('notecount'):
                    try:
                        diff_data['notes'] = int(info[diff]['notecount'])
                    except:
                        pass
                
                if info[diff].get('tcharter') and info[diff]['tcharter']:
                    charter_str = info[diff]['tcharter']
                    charters = []
                    if ' & ' in charter_str:
                        charters = charter_str.split(' & ')
                    elif ' vs ' in charter_str:
                        charters = charter_str.split(' vs ')
                    elif ' vs.' in charter_str:
                        charters = charter_str.split(' vs.')
                    elif ' + ' in charter_str:
                        charters = charter_str.split(' + ')
                    elif '、' in charter_str:
                        charters = charter_str.split('、')
                    else:
                        charters = [charter_str]
                    diff_data['charter'] = charters
                
                if diff_data:
                    charts[diff] = diff_data
        
        if charts:
            new_data['charts'] = charts
        
        if new_data:
            song.update(new_data)
            updated_count += 1
            print(f"  Updated: {song_id}")
        else:
            print(f"  No new data: {song_id}")
    
    save_songs(songs)
    print(f"\nUpdated {updated_count} songs")

if __name__ == "__main__":
    main()