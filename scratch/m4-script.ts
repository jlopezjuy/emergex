import { Project, SyntaxKind, PropertyAccessExpression, CallExpression } from 'ts-morph';

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});
project.addSourceFilesAtPaths('src/app/**/*.ts');

const sourceFiles = project.getSourceFiles();
let totalModified = 0;

for (const sf of sourceFiles) {
  let modified = false;

  const classes = sf.getClasses();
  for (const cls of classes) {
    if (!cls.getDecorator('Component')) continue; // solo componentes

    const calls = cls.getDescendantsOfKind(SyntaxKind.CallExpression);
    const subscribeCalls = calls.filter(c => c.getExpression().getText().endsWith('.subscribe'));

    if (subscribeCalls.length === 0) continue;

    let needsDestroyRefImport = false;
    let needsTakeUntilDestroyedImport = false;

    let destroyRefProp = cls.getProperty('destroyRef');
    if (!destroyRefProp) {
        cls.insertProperty(0, {
            name: 'destroyRef',
            scope: 'private' as any,
            initializer: 'inject(DestroyRef)'
        });
        needsDestroyRefImport = true;
        modified = true;
    }

    let moreToProcess = true;
    while(moreToProcess) {
        const calls = cls.getDescendantsOfKind(SyntaxKind.CallExpression);
        const subscribeCalls = calls.filter(c => {
             const text = c.getExpression().getText();
             if (!text.endsWith('.subscribe')) return false;
             
             const caller = (c.getExpression() as PropertyAccessExpression).getExpression();
             if (caller.getKind() === SyntaxKind.CallExpression) {
                 const callerCall = caller as CallExpression;
                 const callerPropAccess = callerCall.getExpression();
                 if (callerPropAccess.getKind() === SyntaxKind.PropertyAccessExpression && (callerPropAccess as PropertyAccessExpression).getName() === 'pipe') {
                     const args = callerCall.getArguments();
                     const hasTakeUntil = args.some(a => a.getText().includes('takeUntilDestroyed'));
                     if (hasTakeUntil) return false;
                 }
             }
             return true;
        });

        if (subscribeCalls.length === 0) {
            moreToProcess = false;
            break;
        }

        const sub = subscribeCalls[0];
        const expression = sub.getExpression();
        if (expression.getKind() === SyntaxKind.PropertyAccessExpression) {
            const propAccess = expression as PropertyAccessExpression;
            const caller = propAccess.getExpression();
            
            if (caller.getKind() === SyntaxKind.CallExpression) {
                const callerCall = caller as CallExpression;
                const callerPropAccess = callerCall.getExpression();
                if (callerPropAccess.getKind() === SyntaxKind.PropertyAccessExpression && (callerPropAccess as PropertyAccessExpression).getName() === 'pipe') {
                    callerCall.addArgument('takeUntilDestroyed(this.destroyRef)');
                    needsTakeUntilDestroyedImport = true;
                    modified = true;
                    continue; // tree updated
                }
            }

            // No es un pipe, lo reemplazamos
            const callerText = caller.getText();
            const subscribeArgs = sub.getArguments().map(a => a.getText()).join(', ');
            sub.replaceWithText(`${callerText}.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(${subscribeArgs})`);
            needsTakeUntilDestroyedImport = true;
            modified = true;
        }
    }

    if (needsDestroyRefImport) {
        const coreImport = sf.getImportDeclaration(d => d.getModuleSpecifierValue() === '@angular/core');
        if (coreImport) {
            if (!coreImport.getNamedImports().some(n => n.getName() === 'DestroyRef')) coreImport.addNamedImport('DestroyRef');
            if (!coreImport.getNamedImports().some(n => n.getName() === 'inject')) coreImport.addNamedImport('inject');
        } else {
            sf.addImportDeclaration({ moduleSpecifier: '@angular/core', namedImports: ['DestroyRef', 'inject'] });
        }
    }

    if (needsTakeUntilDestroyedImport) {
        const rxjsImport = sf.getImportDeclaration(d => d.getModuleSpecifierValue() === '@angular/core/rxjs-interop');
        if (rxjsImport) {
            if (!rxjsImport.getNamedImports().some(n => n.getName() === 'takeUntilDestroyed')) rxjsImport.addNamedImport('takeUntilDestroyed');
        } else {
            sf.addImportDeclaration({ moduleSpecifier: '@angular/core/rxjs-interop', namedImports: ['takeUntilDestroyed'] });
        }
    }
  }

  if (modified) {
    sf.saveSync();
    console.log('Modified:', sf.getFilePath());
    totalModified++;
  }
}
console.log(`Total files modified: ${totalModified}`);
