import os
import re

def replace_alerts_in_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.jsx'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Check if file has alert
                if 'alert(' in content:
                    print(f"Replacing alerts in {filepath}")
                    
                    # We only want to replace alert(...) with showToast(..., 'error')
                    # Note: we need to make sure useToast is imported and showToast is available.
                    # First, replace the alert strings
                    # Be careful with nested parentheses, but typically alert only takes 1 string argument.
                    # regex: \balert\(([^)]+)\) -> showToast(\1, 'error')
                    # wait, some alerts might span multiple lines or have nested parentheses like (err.response?.data?.message || err.message)
                    # A better way is to do it cautiously.
                    
                    # Let's manually write a regex that matches `alert(` and we'll balance parentheses.
                    new_content = ""
                    idx = 0
                    while True:
                        start = content.find('alert(', idx)
                        if start == -1:
                            new_content += content[idx:]
                            break
                        
                        new_content += content[idx:start]
                        
                        # Find the matching closing parenthesis
                        paren_count = 1
                        i = start + 6
                        while i < len(content):
                            if content[i] == '(':
                                paren_count += 1
                            elif content[i] == ')':
                                paren_count -= 1
                                if paren_count == 0:
                                    break
                            i += 1
                        
                        inside_alert = content[start+6:i]
                        # Replace
                        new_content += f"showToast({inside_alert}, 'error')"
                        idx = i + 1
                    
                    # Now we need to ensure `const { showToast } = useToast();` is in the component 
                    # and `import { useToast } from '../context/ToastContext';` is imported.
                    
                    # If useToast is not imported:
                    if 'useToast' not in new_content:
                        # Find last import
                        last_import_idx = new_content.rfind('import ')
                        if last_import_idx != -1:
                            end_of_last_import = new_content.find('\n', last_import_idx)
                            # Assuming relative path is '../context/ToastContext' for components/pages
                            # Let's see if it's components or pages
                            rel_path = '../context/ToastContext' if 'pages' in filepath or 'components' in filepath else './context/ToastContext'
                            new_content = new_content[:end_of_last_import+1] + f"import {{ useToast }} from '{rel_path}';\n" + new_content[end_of_last_import+1:]
                    
                    # We also need `const { showToast } = useToast();` in the component.
                    # This is trickier to automate perfectly, but we can check if `showToast` is destructured.
                    if 'const { showToast } = useToast();' not in new_content:
                        # For PlanPage.jsx, it's already there in the main component, but AddProjectForm needs it.
                        # For others, we might need to insert it manually.
                        pass
                    
                    with open(filepath, 'w', encoding='utf-8') as f:
                        f.write(new_content)

replace_alerts_in_dir('d:\\OneDrive\\Desktop\\Agent 3\\Agent3git\\new_agent_3_FE\\src')
